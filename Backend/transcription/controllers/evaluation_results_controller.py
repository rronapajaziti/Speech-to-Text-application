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
    qs = EvaluationResults.objects.select_related("transcription").all()

    transcription_id = request.query_params.get("transcription_id")
    if transcription_id:
        qs = qs.filter(transcription_id=transcription_id)

    serializer = EvaluationResultsSerializer(qs, many=True)
    payload = []
    for row, item in zip(qs, serializer.data):
        created_at = item.get("created_at")
        model_name = row.transcription.model_name if row.transcription else None
        payload.append(
            {
                **item,
                "model_name": model_name,
                # compatibility key used by frontend history page
                "evaluation_date": created_at,
            }
        )
    return Response(payload)

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
        age =age,

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
    serializer = EvaluationResultsSerializer(instance=evaluation_result, data=request.data)
    if serializer.is_valid():
        serializer.save()
    return Response(serializer.data)


@api_view(['DELETE'])
def deleteEvaluationResult(request, pk):
    try:
        evaluation_result = get_object_or_404(EvaluationResults, id=pk)

        transcription = evaluation_result.transcription
        audio = transcription.audio if transcription else None

        # delete in correct order (child → parent)
        evaluation_result.delete()

        if transcription:
            transcription.delete()

        if audio:
            audio.delete()

        return Response({"message": "Evaluation, transcription, and audio deleted successfully"})

    except Http404:
        logger.error(f"EvaluationResult with id={pk} not found for deletion")
        raise