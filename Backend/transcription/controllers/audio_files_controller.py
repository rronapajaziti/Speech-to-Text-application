import logging
from pathlib import Path
from django.shortcuts import get_object_or_404
from django.http import Http404
from rest_framework.decorators import api_view, parser_classes
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework.response import Response
from ..models import AudioFiles
from ..serializers import AudioFilesSerializer
from ..services.pipeline_service import create_transcription

logger = logging.getLogger(__name__)



@api_view(['GET'])
def getAudioFiles(request):
    audio_files = AudioFiles.objects.all()
    serializer = AudioFilesSerializer(audio_files, many=True)
    return Response(serializer.data)


@api_view(['GET'])
def getAudioFile(request, pk):
    try:
        audio_file = get_object_or_404(AudioFiles, id=pk)
    except Http404:
        logger.error(f"AudioFile with id={pk} not found")
        raise
    serializer = AudioFilesSerializer(audio_file, many=False)
    return Response(serializer.data)


@api_view(['POST'])
@parser_classes((MultiPartParser, FormParser))
def addAudioFile(request):
    user_id = request.data.get("user")
    file_hash = (request.data.get("file_hash") or "").strip().lower()

    run_transcription = str(request.data.get("run_transcription") or "").strip().lower() in {
        "1",
        "true",
        "yes",
        "y",
    }
    reference_text = request.data.get("reference_text")
    model_name = request.data.get("model_name", "base")
    mode = request.data.get("mode", "transcribe")
    dialect_hint = request.data.get("dialect")

    if user_id and file_hash:
        existing = AudioFiles.objects.filter(user_id=user_id, file_hash=file_hash).first()
        if existing and existing.audio_file:
            try:
                if not Path(existing.audio_file.path).exists():
                    logger.warning(
                        "Audio file missing on disk for id=%s path=%s; re-upload required",
                        existing.id,
                        existing.audio_file.path,
                    )
                    existing = None
            except Exception:
                logger.exception("Failed to stat existing audio file for id=%s", existing.id)
                existing = None

        if existing and existing.audio_file:
            transcription_result = None
            if run_transcription:
                try:
                    transcription_result = create_transcription(
                        existing.id,
                        reference_text,
                        model_name,
                        mode,
                        dialect_hint,
                    )
                except Exception:
                    logger.exception("Failed to create transcription for existing audio_id=%s", existing.id)
                    return Response(
                        {"detail": "Transcription failed on server. Check backend logs."},
                        status=500,
                    )
            return Response(
                {
                    "audio_file": AudioFilesSerializer(existing).data,
                    "transcription": transcription_result,
                    "reused": True,
                },
                status=201,
            )

    serializer = AudioFilesSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(serializer.errors, status=400)

    audio_file = serializer.save()
    transcription_result = None
    if run_transcription and audio_file.audio_file:
        try:
            transcription_result = create_transcription(
                audio_file.id,
                reference_text,
                model_name,
                mode,
                dialect_hint,
            )
        except Exception:
            logger.exception("Failed to create transcription for audio_id=%s", audio_file.id)
            return Response(
                {"detail": "Transcription failed on server. Check backend logs."},
                status=500,
            )
    response_data = {
        "audio_file": AudioFilesSerializer(audio_file).data,
        "transcription": transcription_result,
        "reused": False,
    }
    return Response(response_data, status=201)


@api_view(['PUT'])
@parser_classes((MultiPartParser, FormParser))
def updateAudioFile(request, pk):
    try:
        audio_file = get_object_or_404(AudioFiles, id=pk)
    except Http404:
        logger.error(f"AudioFile with id={pk} not found for update")
        raise
    serializer = AudioFilesSerializer(instance=audio_file, data=request.data, partial=True)
    if serializer.is_valid():
        serializer.save()
        return Response(serializer.data)
    return Response(serializer.errors, status=400)


@api_view(['DELETE'])
def deleteAudioFile(request, pk):
    try:
        audio_file = get_object_or_404(AudioFiles, id=pk)
    except Http404:
        logger.error(f"AudioFile with id={pk} not found for deletion")
        raise
    audio_file.delete()
    return Response('Item successfully deleted')
