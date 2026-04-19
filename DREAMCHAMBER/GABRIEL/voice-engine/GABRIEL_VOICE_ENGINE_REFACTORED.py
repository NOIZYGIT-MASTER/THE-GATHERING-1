"""🗣️ GABRIEL VOICE ENGINE - REFACTORED WITH TURBO FOUNDATION"""

import asyncio
from pathlib import Path
from turbo_config import config
from turbo_queue import turbo_queue, Priority
import sys

class VoiceEngine:
    def __init__(self):
        # Use centralized config
        self.api_key = config.get('api_keys.elevenlabs')
        self.cache_dir = Path(config.get('paths.cache')) / 'voice'
        self.cache_dir.mkdir(parents=True, exist_ok=True)
        
        self.personas = {
            "sage": config.get('voice.personas.sage', "21m00Tcm4TlvDq8ikWAM"),
            "warrior": config.get('voice.personas.warrior', "pNInz6obpgDQGcFmaJgB"),
            "mystic": config.get('voice.personas.mystic', "EXAVITQu4vr4xnSDxMaL"),
            "architect": config.get('voice.personas.architect', "TX3LPaxHard ass oh I'm in charge I'm the boss no sorrym