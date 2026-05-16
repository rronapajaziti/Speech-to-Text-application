import logging
from django.shortcuts import get_object_or_404
from django.http import Http404
from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework.pagination import PageNumberPagination

from ..models import EvaluationResults, Transcription
from ..serializers import EvaluationResultsSerializer
from ..services.evaluation_service import evaluate_transcription

logger = logging.getLogger(__name__)


class StandardResultsSetPagination(PageNumberPagination):
    page_size = 10
    page_size_query_param = "page_size"
    max_page_size = 100


@api_view(['GET'])
def getEvaluationResults(request):
    qs = EvaluationResults.objects.select_related("transcription").order_by("-id")

    transcription_id = request.query_params.get("transcription_id")
    if transcription_id:
        qs = qs.filter(transcription_id=transcription_id)

    paginator = StandardResultsSetPagination()
    page = paginator.paginate_queryset(qs, request)

    data = []
    for row in page:
        data.append({
            "id": row.id,
            "transcription": row.transcription_id,
            "wer": row.wer,
            "dialect": row.dialect,
            "gender": row.gender,
            "age": row.age,
            "created_at": row.created_at,
            "model_name": row.transcription.model_name if row.transcription else None,
            "evaluation_date": row.created_at,
            "username": row.transcription.audio.user.username if row.transcription and row.transcription.audio and row.transcription.audio.user else None,
        })

    return paginator.get_paginated_response(data)


@api_view(['GET'])
def getEvaluationResult(request, pk):
    evaluation_result = get_object_or_404(EvaluationResults, id=pk)

    serializer = EvaluationResultsSerializer(evaluation_result)

    data = serializer.data

    return Response({
        **data,
        "evaluation_date": evaluation_result.created_at,
        "model_name": evaluation_result.transcription.model_name if evaluation_result.transcription else None,
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
        age=age,
        wer=result["wer"],
        cer=result["cer"],
        mer=None,
        wil=None,
        wip=None,
        hits=result.get("hits", 0),
        substitutions=result["substitutions"],
        deletions=result["deletions"],
        insertions=result["insertions"],
        alignment=result.get("alignment", []),
    )

    return Response(EvaluationResultsSerializer(evaluation).data, status=201)


@api_view(['PUT'])
def updateEvaluationResult(request, pk):
    try:
        evaluation_result = get_object_or_404(EvaluationResults, id=pk)
    except Http404:
        logger.error(f"EvaluationResult with id={pk} not found for update")
        raise

    serializer = EvaluationResultsSerializer(
        instance=evaluation_result,
        data=request.data
    )

    if serializer.is_valid():
        serializer.save()

    return Response(serializer.data)


@api_view(['DELETE'])
def deleteEvaluationResult(request, pk):
    try:
        evaluation_result = get_object_or_404(EvaluationResults, id=pk)

        transcription = evaluation_result.transcription

        evaluation_result.delete()

        if transcription:
            transcription.delete()

        return Response({
            "message": "Evaluation and transcription deleted successfully"
        })

    except Http404:
        logger.error(f"EvaluationResult with id={pk} not found for deletion")
        raise