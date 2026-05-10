import logging
from rest_framework import generics, status
from django.shortcuts import get_object_or_404
from django.http import Http404
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.contrib.auth.models import User
from ..serializers import UserSerializer, LoginUserSerializer
from rest_framework_simplejwt.tokens import RefreshToken


logger = logging.getLogger(__name__)

#get all users

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def getUsers(request):
    users = User.objects.all()
    serializer = UserSerializer(users,many=True)
    return Response(serializer.data)


@api_view(['GET'])
def getUsersPublic(request):
    users = User.objects.all().order_by("id")
    data = [{"id": u.id, "username": u.username} for u in users]
    return Response(data)

#get single user
@api_view(['GET'])
# NOTE(dev): temporarily public for UI display (no token yet).
# @permission_classes([IsAuthenticated])
def getUser(request,pk):
    try:
        users = get_object_or_404(User,id=pk)
    except Http404:
        logger.error(f"User with id={pk} not found")
        raise
    serializer = UserSerializer(users,many=False)
    return Response(serializer.data)

#add user
@api_view(['POST'])
def addUser(request):
    serializer = UserSerializer(data=request.data)

    if serializer.is_valid():
        serializer.save()
        return Response(serializer.data, status = status.HTTP_201_CREATED)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

#update user
@api_view(['PUT'])
# @permission_classes([IsAuthenticated])
def updateUser(request,pk):
    try:
        user = get_object_or_404(User, id=pk)
    except Http404:
        logger.error(f"User with id={pk} not found for update")
        raise
    serializer = UserSerializer(instance=user, data=request.data)

    if serializer.is_valid():
        serializer.save()
        return Response(serializer.data, status = status.HTTP_200_OK)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

#delete user
@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def deleteUser(request,pk):
    try:
        user = get_object_or_404(User, id=pk)
    except Http404:
        logger.error(f"User with id={pk} not found for deletion")
        raise
    user.delete()
    return Response('Item successfully deleted', status = status.HTTP_200_OK)

#login user
@api_view(['POST'])
def loginUser(request):
    serializer = LoginUserSerializer(data=request.data)
    if serializer.is_valid():
        user = serializer.validated_data['user']
        refresh = RefreshToken.for_user(user)
        return Response({
            'access': str(refresh.access_token),
            'refresh': str(refresh),
        })
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)