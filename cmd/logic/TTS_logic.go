package logic

import "github.com/gin-gonic/gin"

type Logic struct {
	logic *Logic
}

type GetAudioRequest struct {
	Text               string `form:"text"`
	ReferenceAudioFile string `form:"reference_audio_file"`
	emoText            string `form:"emo_text"`
}

func (l *Logic) GetAudio(ctx *gin.Context) {
	var req GetAudioRequest
	err := ctx.BindQuery(&req)
	if err != nil {
		return
	}
	
}
