package com.scribespeak.app.domain.repository

import com.scribespeak.app.domain.model.VoiceOption

interface VoiceRepository {
    suspend fun getAvailableVoices(): List<VoiceOption>
}
