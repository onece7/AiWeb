package handlers

import (
	"path"
	"path/filepath"
	"strings"

	"github.com/gin-gonic/gin"

	"novel2comic/backend/pkg/response"
)

// ServeGeneratedFile 提供生成的图片文件
// GET /api/v1/files/*filepath
func ServeGeneratedFile(uploadDir string) gin.HandlerFunc {
	return func(c *gin.Context) {
		filename := c.Param("filepath")

		// 安全检查：使用 path.Clean（始终 / 分隔）验证，防止路径遍历
		cleanPath := path.Clean(filename)
		if cleanPath != filename || strings.Contains(filename, "..") {
			response.BadRequest(c, "无效的文件路径")
			return
		}

		// 文件系统操作使用 filepath.Join（适配 OS 分隔符）
		filePath := filepath.Join(uploadDir, filepath.FromSlash(filename))
		c.File(filePath)
	}
}
