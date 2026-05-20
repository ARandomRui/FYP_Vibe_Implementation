package com.scribespeak.app.domain.model

data class VoiceOption(
    val id: String,
    val name: String,
    val localeTag: String,
    val isOfflinePreferred: Boolean,
    val isInstalled: Boolean,
)
