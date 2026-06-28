package service

import (
	"bytes"
	"context"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"time"

	"novel2comic/backend/internal/config"
)

// SDProvider SD 生图接口抽象
type SDProvider interface {
	Generate(ctx context.Context, params *GenerateParams) (*GenerateResult, error)
}

// GenerateParams 生成参数
type GenerateParams struct {
	Prompt         string  `json:"prompt"`
	NegativePrompt string  `json:"negative_prompt"`
	Width          int     `json:"width"`
	Height         int     `json:"height"`
	Steps          int     `json:"steps"`
	CFGScale       float64 `json:"cfg_scale"`
	Sampler        string  `json:"sampler_name"`
	Seed           int64   `json:"seed"`
}

// GenerateResult 生成结果
type GenerateResult struct {
	ImageData []byte `json:"image_data"` // 解码后的图片数据
	Seed      int64  `json:"seed"`
}

// sdClient SD 客户端实现
type sdClient struct {
	cfg      *config.Config
	provider SDProvider
}

// NewSDClient 创建 SD 客户端 (根据配置选择实现)
func NewSDClient(cfg *config.Config) *sdClient {
	c := &sdClient{cfg: cfg}
	timeout := time.Duration(cfg.SD.RequestTimeout) * time.Second
	httpClient := &http.Client{Timeout: timeout}

	// 配置驱动选择后端
	if cfg.SD.APIKey != "" {
		c.provider = &replicateProvider{apiKey: cfg.SD.APIKey, httpClient: httpClient}
	} else if cfg.SD.BaseURL != "" {
		c.provider = &a1111Provider{baseURL: cfg.SD.BaseURL, httpClient: httpClient}
	}
	// 如果都没配置，provider 为 nil，后续生成时返回错误

	return c
}

// Generate 调用 SD 生成图片
func (c *sdClient) Generate(ctx context.Context, params *GenerateParams) (*GenerateResult, error) {
	if c.provider == nil {
		return nil, fmt.Errorf("SD 后端未配置: 请设置 sd.base_url (A1111) 或 sd.api_key (Replicate)")
	}
	return c.provider.Generate(ctx, params)
}

// IsConfigured 检查 SD 是否已配置
func (c *sdClient) IsConfigured() bool {
	return c.provider != nil
}

// ============ A1111 实现 ============

type a1111Provider struct {
	baseURL    string
	httpClient *http.Client
}

// a1111Request A1111 txt2img 请求结构
type a1111Request struct {
	Prompt         string  `json:"prompt"`
	NegativePrompt string  `json:"negative_prompt"`
	Width          int     `json:"width"`
	Height         int     `json:"height"`
	Steps          int     `json:"steps"`
	CFGScale       float64 `json:"cfg_scale"`
	SamplerName    string  `json:"sampler_name"`
	Seed           int64   `json:"seed"`
}

// a1111Response A1111 txt2img 响应结构
type a1111Response struct {
	Images     []string               `json:"images"` // base64 编码的图片
	Parameters map[string]interface{} `json:"parameters"`
	Info       string                 `json:"info"`
}

func (p *a1111Provider) Generate(ctx context.Context, params *GenerateParams) (*GenerateResult, error) {
	reqBody := a1111Request{
		Prompt:         params.Prompt,
		NegativePrompt: params.NegativePrompt,
		Width:          params.Width,
		Height:         params.Height,
		Steps:          params.Steps,
		CFGScale:       params.CFGScale,
		SamplerName:    params.Sampler,
		Seed:           params.Seed,
	}

	bodyBytes, err := json.Marshal(reqBody)
	if err != nil {
		return nil, fmt.Errorf("序列化请求失败: %w", err)
	}

	url := fmt.Sprintf("%s/sdapi/v1/txt2img", p.baseURL)
	req, err := http.NewRequestWithContext(ctx, "POST", url, bytes.NewReader(bodyBytes))
	if err != nil {
		return nil, fmt.Errorf("创建请求失败: %w", err)
	}
	req.Header.Set("Content-Type", "application/json")

	resp, err := p.httpClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("请求 SD API 失败: %w", err)
	}
	defer resp.Body.Close()

	respBytes, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("读取响应失败: %w", err)
	}

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("SD API 返回错误 (%d): %s", resp.StatusCode, string(respBytes))
	}

	var a1111Resp a1111Response
	if err := json.Unmarshal(respBytes, &a1111Resp); err != nil {
		return nil, fmt.Errorf("解析响应失败: %w", err)
	}

	if len(a1111Resp.Images) == 0 {
		return nil, fmt.Errorf("SD 未返回图片")
	}

	// 解码 base64 图片
	imageData, err := base64.StdEncoding.DecodeString(a1111Resp.Images[0])
	if err != nil {
		return nil, fmt.Errorf("解码图片失败: %w", err)
	}

	// 从 info 中提取 seed
	seed := params.Seed
	if a1111Resp.Info != "" {
		var info map[string]interface{}
		if json.Unmarshal([]byte(a1111Resp.Info), &info) == nil {
			if s, ok := info["seed"].(float64); ok {
				seed = int64(s)
			}
		}
	}

	return &GenerateResult{
		ImageData: imageData,
		Seed:      seed,
	}, nil
}

// ============ Replicate 实现 ============

type replicateProvider struct {
	apiKey     string
	httpClient *http.Client
}

// replicatePredictionRequest Replicate 创建 prediction 请求
type replicatePredictionRequest struct {
	Version string `json:"version,omitempty"`
	Input   struct {
		Prompt         string  `json:"prompt"`
		NegativePrompt string  `json:"negative_prompt,omitempty"`
		Width          int     `json:"width"`
		Height         int     `json:"height"`
		NumSteps       int     `json:"num_inference_steps,omitempty"`
		GuidanceScale  float64 `json:"guidance_scale,omitempty"`
		Seed           int64   `json:"seed,omitempty"`
	} `json:"input"`
}

// replicatePrediction Replicate prediction 状态响应
type replicatePrediction struct {
	ID     string `json:"id"`
	Status string `json:"status"` // starting, processing, succeeded, failed, canceled
	Output  []string `json:"output"` // 输出图片 URL 列表
	Error  string `json:"error"`
}

func (p *replicateProvider) Generate(ctx context.Context, params *GenerateParams) (*GenerateResult, error) {
	// 1. 创建 prediction
	reqBody := replicatePredictionRequest{}
	reqBody.Input.Prompt = params.Prompt
	reqBody.Input.NegativePrompt = params.NegativePrompt
	reqBody.Input.Width = params.Width
	reqBody.Input.Height = params.Height
	reqBody.Input.NumSteps = params.Steps
	reqBody.Input.GuidanceScale = params.CFGScale
	if params.Seed >= 0 {
		reqBody.Input.Seed = params.Seed
	}

	bodyBytes, err := json.Marshal(reqBody)
	if err != nil {
		return nil, fmt.Errorf("序列化请求失败: %w", err)
	}

	req, err := http.NewRequestWithContext(ctx, "POST", "https://api.replicate.com/v1/predictions", bytes.NewReader(bodyBytes))
	if err != nil {
		return nil, fmt.Errorf("创建请求失败: %w", err)
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Token "+p.apiKey)

	resp, err := p.httpClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("请求 Replicate API 失败: %w", err)
	}
	defer resp.Body.Close()

	respBytes, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("读取响应失败: %w", err)
	}

	if resp.StatusCode != http.StatusCreated && resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("Replicate API 返回错误 (%d): %s", resp.StatusCode, string(respBytes))
	}

	var prediction replicatePrediction
	if err := json.Unmarshal(respBytes, &prediction); err != nil {
		return nil, fmt.Errorf("解析 Replicate 响应失败: %w", err)
	}

	// 2. 轮询直到完成
	pollInterval := 1 * time.Second
	maxPolls := 120 // 最多等待 2 分钟
	for i := 0; i < maxPolls; i++ {
		select {
		case <-ctx.Done():
			return nil, ctx.Err()
		case <-time.After(pollInterval):
		}

		updated, err := p.getPrediction(ctx, prediction.ID)
		if err != nil {
			return nil, err
		}
		prediction = *updated

		switch prediction.Status {
		case "succeeded":
			if len(prediction.Output) == 0 {
				return nil, fmt.Errorf("Replicate 未返回图片")
			}
			// 下载输出图片
			imageData, err := p.downloadImage(ctx, prediction.Output[0])
			if err != nil {
				return nil, err
			}
			return &GenerateResult{
				ImageData: imageData,
				Seed:      params.Seed, // Replicate 不直接返回 seed
			}, nil
		case "failed", "canceled":
			errMsg := prediction.Error
			if errMsg == "" {
				errMsg = prediction.Status
			}
			return nil, fmt.Errorf("Replicate 生成失败: %s", errMsg)
		}
		// starting / processing → 继续轮询
		pollInterval = 2 * time.Second // 递增间隔
	}

	return nil, fmt.Errorf("Replicate 生成超时: 已等待 %d 秒", maxPolls*2)
}

// getPrediction 查询 prediction 状态
func (p *replicateProvider) getPrediction(ctx context.Context, id string) (*replicatePrediction, error) {
	url := fmt.Sprintf("https://api.replicate.com/v1/predictions/%s", id)
	req, err := http.NewRequestWithContext(ctx, "GET", url, nil)
	if err != nil {
		return nil, fmt.Errorf("创建查询请求失败: %w", err)
	}
	req.Header.Set("Authorization", "Token "+p.apiKey)

	resp, err := p.httpClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("查询 Replicate 状态失败: %w", err)
	}
	defer resp.Body.Close()

	respBytes, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("读取查询响应失败: %w", err)
	}

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("Replicate 查询返回错误 (%d): %s", resp.StatusCode, string(respBytes))
	}

	var prediction replicatePrediction
	if err := json.Unmarshal(respBytes, &prediction); err != nil {
		return nil, fmt.Errorf("解析 Replicate 状态响应失败: %w", err)
	}

	return &prediction, nil
}

// downloadImage 下载 Replicate 输出的图片
func (p *replicateProvider) downloadImage(ctx context.Context, url string) ([]byte, error) {
	req, err := http.NewRequestWithContext(ctx, "GET", url, nil)
	if err != nil {
		return nil, fmt.Errorf("创建下载请求失败: %w", err)
	}

	// 下载可能走不同的域名，不带 Authorization
	resp, err := p.httpClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("下载图片失败: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("下载图片返回错误 (%d)", resp.StatusCode)
	}

	return io.ReadAll(resp.Body)
}
