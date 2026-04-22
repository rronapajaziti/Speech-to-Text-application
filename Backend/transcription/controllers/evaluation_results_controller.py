import logging
from django.shortcuts import get_object_or_404
from django.http import Http404
from rest_framework.decorators import api_view
from rest_framework.response import Response
from ..models import EvaluationResults,Transcription
from ..serializers import EvaluationResultsSerializer
from ..services.evaluation_service import evaluate_transcription
logger = logging.getLogger(__name__)


@api_view(['GET'])
def getEvaluationResults(request):
    evaluation_results = EvaluationResults.objects.all()
    serializer = EvaluationResultsSerializer(evaluation_results, many=True)
    return Response(serializer.data)


@api_view(['GET'])
def getEvaluationResult(request, pk):
    try:
        evaluation_result = get_object_or_404(EvaluationResults, id=pk)
    except Http404:
        logger.error(f"EvaluationResult with id={pk} not found")
        raise
    serializer = EvaluationResultsSerializer(evaluation_result, many=False)
    return Response(serializer.data)


@api_view(['POST'])
def addEvaluationResult(request):
    transcription_id = request.data.get("transcription_id")
    gender = request.data.get("gender")
    dialect = request.data.get("dialect")

    if not transcription_id:
        return Response({"error": "transcription_id required"}, status=400)

    transcription = get_object_or_404(Transcription, id=transcription_id)

    result = evaluate_transcription(
        transcription.reference_text,
        transcription.raw_text
    )

    evaluation = EvaluationResults.objects.create(
        transcription=transcription,
        gender=gender,
        dialect=dialect,

        wer=result["wer"],
        cer=result["cer"],
        mer=None,
        wil=None,
        wip=None,

        hits=0,
        substitutions=result["substitutions"],
        deletions=result["deletions"],
        insertions=result["insertions"],
    )

    return Response(EvaluationResultsSerializer(evaluation).data, status=201)
    
@api_view(['PUT'])
def updateEvaluationResult(request, pk):
    try:
        evaluation_result = get_object_or_404(EvaluationResults, id=pk)
    except Http404:
        logger.error(f"EvaluationResult with id={pk} not found for update")
        raise
    serializer = EvaluationResultsSerializer(instance=evaluation_result, data=request.data)
    if serializer.is_valid():
        serializer.save()
    return Response(serializer.data)


@api_view(['DELETE'])
def deleteEvaluationResult(request, pk):
    try:
        evaluation_result = get_object_or_404(EvaluationResults, id=pk)
    except Http404:
        logger.error(f"EvaluationResult with id={pk} not found for deletion")
        raise
    evaluation_result.delete()
    return Response('Item successfully deleted')
