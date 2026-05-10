import logging
import hashlib
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


def generate_file_hash(uploaded_file):
    hasher = hashlib.sha256()

    for chunk in uploaded_file.chunks():
        hasher.update(chunk)

    uploaded_file.seek(0)  # reset pointer after reading
    return hasher.hexdigest()


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

    serializer = AudioFilesSerializer(audio_file)
    return Response(serializer.data)


@api_view(['POST'])
@parser_classes((MultiPartParser, FormParser))
def addAudioFile(request):
    user_id = request.data.get("user")
    uploaded_file = request.FILES.get("audio_file")

    file_hash = None
    if uploaded_file:
        file_hash = generate_file_hash(uploaded_file)
    else:
        file_hash = (request.data.get("file_hash") or "").strip().lower()

    run_transcription = str(request.data.get("run_transcription") or "").strip().lower() in {
        "1", "true", "yes", "y"
    }

    reference_text = request.data.get("reference_text")
    model_name = request.data.get("model_name", "base")
    mode = request.data.get("mode", "transcribe")
    dialect_hint = request.data.get("dialect")

    if file_hash:
        existing = AudioFiles.objects.filter(file_hash=file_hash).first()

        if existing and existing.audio_file:
            try:
                from pathlib import Path

                if not Path(existing.audio_file.path).exists():
                    logger.warning("Missing file on disk for id=%s", existing.id)
                    existing = None
            except Exception:
                logger.exception("File check failed for id=%s", existing.id)
                existing = None

        if existing:
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
                    logger.exception(
                        "Transcription failed for reused audio id=%s",
                        existing.id,
                    )
                    return Response(
                        {"detail": "Transcription failed."},
                        status=500,
                    )

            return Response(
                {
                    "audio_file": AudioFilesSerializer(existing).data,
                    "transcription": transcription_result,
                    "reused": True,
                },
                status=200,
            )

    serializer = AudioFilesSerializer(data=request.data)

    if not serializer.is_valid():
        return Response(serializer.errors, status=400)

    audio_file = serializer.save(file_hash=file_hash)

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
            logger.exception(
                "Transcription failed for audio id=%s",
                audio_file.id,
            )
            return Response(
                {"detail": "Transcription failed."},
                status=500,
            )

    return Response(
        {
            "audio_file": AudioFilesSerializer(audio_file).data,
            "transcription": transcription_result,
            "reused": False,
        },
        status=201,
    )

@api_view(['PUT'])
@parser_classes((MultiPartParser, FormParser))
def updateAudioFile(request, pk):
    try:
        audio_file = get_object_or_404(AudioFiles, id=pk)
    except Http404:
        logger.error(f"AudioFile with id={pk} not found")
        raise

    serializer = AudioFilesSerializer(
        instance=audio_file,
        data=request.data,
        partial=True,
    )

    if serializer.is_valid():
        serializer.save()
        return Response(serializer.data)

    return Response(serializer.errors, status=400)


@api_view(['DELETE'])
def deleteAudioFile(request, pk):
    try:
        audio_file = get_object_or_404(AudioFiles, id=pk)
    except Http404:
        logger.error(f"AudioFile with id={pk} not found")
        raise

    audio_file.delete()
    return Response({"detail": "Deleted successfully"})