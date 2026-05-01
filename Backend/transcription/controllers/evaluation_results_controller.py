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
    qs = EvaluationResults.objects.all()

    transcription_id = request.query_params.get("transcription_id")
    if transcription_id:
        qs = qs.filter(transcription_id=transcription_id)

    serializer = EvaluationResultsSerializer(qs, many=True)
    return Response(serializer.data)

@api_view(['GET'])
def getEvaluationResult(request, pk):
    evaluation_result = get_object_or_404(EvaluationResults, id=pk)

    serializer = EvaluationResultsSerializer(evaluation_result)

    return Response({
        "id": evaluation_result.id,
        "transcription": evaluation_result.transcription.id,
        "wer": evaluation_result.wer,
        "cer": evaluation_result.cer,
        "mer": evaluation_result.mer,
        "wil": evaluation_result.wil,
        "wip": evaluation_result.wip,
        "substitutions": evaluation_result.substitutions,
        "deletions": evaluation_result.deletions,
        "insertions": evaluation_result.insertions,
        "gender": evaluation_result.gender,
        "dialect": evaluation_result.dialect,
        "age": evaluation_result.age,
        "evaluation_date": evaluation_result.evaluation_date,
    })

@api_view(['POST'])
def addEvaluationResult(request):
    transcription_id = request.data.get("transcription_id")
    gender = request.data.get("gender")
    dialect = request.data.get("dialect")
    age = request.data.get("age")

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
        age =age,

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
