package com.scribespeak.app.platform.tts

interface TtsController {
    fun play(text: String, startParagraphIndex: Int = 0)
    fun stop()
    fun resume()
    fun jumpForwardParagraph()
}
