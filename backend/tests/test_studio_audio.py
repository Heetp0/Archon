import sys
import os
import pytest
import wave
import tempfile
from unittest.mock import AsyncMock, MagicMock, patch

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from studio import StudioAgent
from audio_overview import AudioOverviewAgent
from model_router import ModelRouter
from retriever import Retriever

async def dummy_callback(event_type, payload):
    pass

@pytest.fixture
def mock_services():
    router = MagicMock(spec=ModelRouter)
    retriever = MagicMock(spec=Retriever)
    
    # Mock retriever search to return some sample text
    retriever.search = AsyncMock(return_value=[
        {
            "notebook_id": "nb_test",
            "source_id": "Doc1",
            "text": "Quantum computing is a rapidly-emerging technology that harnesses the laws of quantum mechanics to solve problems too complex for classical computers.",
            "location": {"page": 1},
            "score": 0.99
        }
    ])
    return router, retriever

@pytest.mark.asyncio
async def test_studio_agent_study_guide(mock_services):
    router, retriever = mock_services
    
    async def mock_generate(*args, **kwargs):
        yield "# Study Guide\n"
        yield "## Intro\n"
        yield "This is quantum computing."
        
    router.generate.side_effect = mock_generate
    
    agent = StudioAgent(router, retriever)
    
    events = []
    async def callback(event_type, payload):
        events.append((event_type, payload))
        
    payload = {
        "notebook_id": "nb_test",
        "artifact_type": "study_guide",
        "query": "quantum computing intro"
    }
    
    result = await agent.run(payload, callback)
    
    assert "artifact" in result
    assert "Study Guide" in result["artifact"]
    assert retriever.search.called
    assert any(e[0] == "token" and "Study Guide" in e[1]["text"] for e in events)
    assert any(e[0] == "status" and "Generating" in e[1]["status"] for e in events)

@pytest.mark.asyncio
async def test_studio_agent_faq(mock_services):
    router, retriever = mock_services
    
    async def mock_generate(*args, **kwargs):
        yield "**Q:** What is quantum computing?\n"
        yield "**A:** A technology utilizing quantum mechanics."
        
    router.generate.side_effect = mock_generate
    
    agent = StudioAgent(router, retriever)
    
    events = []
    async def callback(event_type, payload):
        events.append((event_type, payload))
        
    payload = {
        "notebook_id": "nb_test",
        "artifact_type": "faq"
    }
    
    result = await agent.run(payload, callback)
    assert "artifact" in result
    assert "**Q:**" in result["artifact"]

@pytest.mark.asyncio
async def test_studio_agent_timeline(mock_services):
    router, retriever = mock_services
    
    async def mock_generate(*args, **kwargs):
        yield "- 1981: Richard Feynman proposes quantum simulators.\n"
        yield "- 1994: Peter Shor publishes Shor's algorithm."
        
    router.generate.side_effect = mock_generate
    
    agent = StudioAgent(router, retriever)
    
    payload = {
        "notebook_id": "nb_test",
        "artifact_type": "timeline"
    }
    
    result = await agent.run(payload, dummy_callback)
    assert "artifact" in result
    assert "Feynman" in result["artifact"]

@pytest.mark.asyncio
async def test_studio_agent_quiz(mock_services):
    router, retriever = mock_services
    
    async def mock_generate(*args, **kwargs):
        yield "1. What is the fundamental unit of quantum information?\n"
        yield "A) Bit\nB) Qubit\nC) Byte\nD) Node\nCorrect Answer: B"
        
    router.generate.side_effect = mock_generate
    
    agent = StudioAgent(router, retriever)
    
    payload = {
        "notebook_id": "nb_test",
        "artifact_type": "quiz"
    }
    
    result = await agent.run(payload, dummy_callback)
    assert "artifact" in result
    assert "Qubit" in result["artifact"]

@pytest.mark.asyncio
async def test_studio_agent_mind_map(mock_services):
    router, retriever = mock_services
    
    async def mock_generate(*args, **kwargs):
        yield "mindmap\n"
        yield "  root((Quantum Computing))\n"
        yield "    Superposition\n"
        yield "    Entanglement"
        
    router.generate.side_effect = mock_generate
    
    agent = StudioAgent(router, retriever)
    
    payload = {
        "notebook_id": "nb_test",
        "artifact_type": "mind_map"
    }
    
    result = await agent.run(payload, dummy_callback)
    assert "artifact" in result
    assert "mindmap" in result["artifact"]

@pytest.mark.asyncio
async def test_audio_overview_conversational(mock_services):
    router, retriever = mock_services
    
    async def mock_generate(*args, **kwargs):
        yield "[Host]: Welcome back to The Core Audio Series!\n"
        yield "[Guest]: Thanks! Today we are discussing quantum physics."
        
    router.generate.side_effect = mock_generate
    
    agent = AudioOverviewAgent(router, retriever)
    
    events = []
    async def callback(event_type, payload):
        events.append((event_type, payload))
        
    with tempfile.TemporaryDirectory() as tmp_dir:
        payload = {
            "notebook_id": "nb_test",
            "format": "conversational",
            "output_dir": tmp_dir
        }
        
        result = await agent.run(payload, callback)
        
        assert "script" in result
        assert "Host" in result["script"]
        assert "Guest" in result["script"]
        assert "audio_path" in result
        
        audio_path = result["audio_path"]
        assert os.path.exists(audio_path)
        assert audio_path.endswith(".wav")
        
        # Verify the WAV file is valid and playable
        with wave.open(audio_path, 'rb') as wav:
            assert wav.getnchannels() == 1
            assert wav.getsampwidth() == 2
            assert wav.getframerate() == 22050
            assert wav.getnframes() > 0

@pytest.mark.asyncio
async def test_audio_overview_lecture(mock_services):
    router, retriever = mock_services
    
    async def mock_generate(*args, **kwargs):
        yield "[Narrator]: Today we will perform a deep dive into quantum logic gates.\n"
        yield "Let us start by defining the Hadamard gate."
        
    router.generate.side_effect = mock_generate
    
    agent = AudioOverviewAgent(router, retriever)
    
    with tempfile.TemporaryDirectory() as tmp_dir:
        payload = {
            "notebook_id": "nb_test",
            "format": "lecture",
            "output_dir": tmp_dir
        }
        
        result = await agent.run(payload, dummy_callback)
        
        assert "script" in result
        assert "Narrator" in result["script"]
        assert "audio_path" in result
        
        audio_path = result["audio_path"]
        assert os.path.exists(audio_path)
        
        with wave.open(audio_path, 'rb') as wav:
            assert wav.getnframes() > 0

@pytest.mark.asyncio
async def test_audio_overview_piper_compilation_failure_fallback(mock_services):
    router, retriever = mock_services
    
    async def mock_generate(*args, **kwargs):
        yield "[Host]: Test host turn\n[Guest]: Test guest turn"
        
    router.generate.side_effect = mock_generate
    
    agent = AudioOverviewAgent(router, retriever)
    
    with patch("shutil.which", return_value="/usr/bin/nonexistent_piper"):
        with tempfile.TemporaryDirectory() as tmp_dir:
            payload = {
                "notebook_id": "nb_test",
                "format": "conversational",
                "output_dir": tmp_dir
            }
            
            result = await agent.run(payload, dummy_callback)
            
            assert "audio_path" in result
            audio_path = result["audio_path"]
            assert os.path.exists(audio_path)
            with wave.open(audio_path, 'rb') as wav:
                assert wav.getnframes() > 0


@pytest.mark.asyncio
async def test_audio_overview_parse_script_bold_tags(mock_services):
    router, retriever = mock_services
    agent = AudioOverviewAgent(router, retriever)
    
    script_with_bold = "**[Host]**: Hello and welcome!\n**Guest**: Glad to be here.\n**[Host]**: Let's discuss quantum mechanics."
    turns = agent._parse_script(script_with_bold)
    
    assert len(turns) == 3
    assert turns[0] == ("Host", "Hello and welcome!")
    assert turns[1] == ("Guest", "Glad to be here.")
    assert turns[2] == ("Host", "Let's discuss quantum mechanics.")

@pytest.mark.asyncio
async def test_audio_overview_concatenate_wav_mismatch(mock_services):
    router, retriever = mock_services
    agent = AudioOverviewAgent(router, retriever)
    
    with tempfile.TemporaryDirectory() as tmp_dir:
        file1 = os.path.join(tmp_dir, "file1.wav")
        file2 = os.path.join(tmp_dir, "file2.wav")
        output_file = os.path.join(tmp_dir, "output.wav")
        
        # Write first wav: mono, 16-bit, 22050Hz
        with wave.open(file1, 'wb') as wav:
            wav.setparams((1, 2, 22050, 100, 'NONE', 'not compressed'))
            wav.writeframes(b"\x00" * 200)
            
        # Write second wav: stereo, 16-bit, 22050Hz (channels mismatch)
        with wave.open(file2, 'wb') as wav:
            wav.setparams((2, 2, 22050, 100, 'NONE', 'not compressed'))
            wav.writeframes(b"\x00" * 400)
            
        with pytest.raises(ValueError) as exc_info:
            agent._concatenate_wav_files([file1, file2], output_file)
            
        assert "Mismatched audio parameters" in str(exc_info.value)
