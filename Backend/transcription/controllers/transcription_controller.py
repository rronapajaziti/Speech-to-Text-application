import logging
from django.shortcuts import get_object_or_404
from django.http import Http404
from rest_framework.decorators import api_view
from rest_framework.response import Response
from ..models import Transcription
from ..serializers import TranscriptionSerializer
from ..services.pipeline_service import create_transcription, update_transcription

logger = logging.getLogger(__name__)


@api_view(['GET'])
def getTranscriptions(request):
    transcriptions = Transcription.objects.all()
    serializer = TranscriptionSerializer(transcriptions, many=True)
    return Response(serializer.data)


@api_view(['GET'])
def getTranscription(request, pk):
    try:
        transcription = get_object_or_404(Transcription, id=pk)
    except Http404:
        logger.error(f"Transcription with id={pk} not found")
        raise
    serializer = TranscriptionSerializer(transcription, many=False)
    return Response(serializer.data)


@api_view(['POST'])
def addTranscription(request):
    audio_id = request.data.get("audio")
    if not audio_id:
        return Response({"error": "audio id is required"}, status=400)

    reference_text = request.data.get("reference_text")
    model_name = request.data.get("model_name", "base")
    mode = request.data.get("mode", "transcribe")

    try:
        result = create_transcription(audio_id, reference_text, model_name, mode)
    except Http404:
        logger.error(f"Audio file with id={audio_id} not found")
        raise
    except ValueError as exc:
        return Response({"error": str(exc)}, status=400)
    except Exception:
        logger.exception("Pipeline failed for audio_id=%s", audio_id)
        return Response({"error": "Transcription pipeline failed"}, status=500)

    return Response(result, status=201)


@api_view(['PUT'])
def updateTranscription(request, pk):
    try:
        transcription = get_object_or_404(Transcription, id=pk)
    except Http404:
        logger.error(f"Transcription with id={pk} not found for update")
        raise

    updated = update_transcription(transcription, request.data)
    serializer = TranscriptionSerializer(updated, many=False)
    return Response(serializer.data)

@api_view(['DELETE'])
def deleteTranscription(request, pk):
    try:
        transcription = get_object_or_404(Transcription, id=pk)
    except Http404:
        logger.error(f"Transcription with id={pk} not found for deletion")
        raise
    transcription.delete()
    return Response('Item successfully deleted')
