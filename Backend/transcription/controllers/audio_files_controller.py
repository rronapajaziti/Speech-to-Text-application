import logging
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
    serializer = AudioFilesSerializer(data=request.data)
    if serializer.is_valid():
        audio_file = serializer.save()
        transcription_result = None
        if audio_file.audio_file:
            try:
                reference_text = request.data.get("reference_text")
                model_name = request.data.get("model_name", "base")
                mode = request.data.get("mode", "transcribe")
                transcription_result = create_transcription(audio_file.id, reference_text, model_name, mode)
            except Exception:
                logger.exception("Failed to create transcription for audio_id=%s", audio_file.id)
        response_data = {
            "audio_file": AudioFilesSerializer(audio_file).data,
            "transcription": transcription_result,
        }
        return Response(response_data, status=201)
    return Response(serializer.errors, status=400)


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
