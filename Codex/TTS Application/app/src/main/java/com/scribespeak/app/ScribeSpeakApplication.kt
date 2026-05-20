package com.scribespeak.app

import android.app.Application
import com.scribespeak.app.data.repository.InMemoryContentRepository
import com.scribespeak.app.data.repository.SystemVoiceRepository
import com.scribespeak.app.domain.repository.ContentRepository
import com.scribespeak.app.domain.repository.VoiceRepository
import com.scribespeak.app.platform.tts.AndroidTtsController
import com.scribespeak.app.platform.tts.TtsController

class ScribeSpeakApplication : Application() {
    lateinit var container: AppContainer
        private set

    override fun onCreate() {
        super.onCreate()
        container = DefaultAppContainer(this)
    }
}

interface AppContainer {
    val contentRepository: ContentRepository
    val voiceRepository: VoiceRepository
    val ttsController: TtsController
}

private class DefaultAppContainer(
    application: Application,
) : AppContainer {
    override val contentRepository: ContentRepository = InMemoryContentRepository()
    override val voiceRepository: VoiceRepository = SystemVoiceRepository(application)
    override val ttsController: TtsController = AndroidTtsController(application)
}
