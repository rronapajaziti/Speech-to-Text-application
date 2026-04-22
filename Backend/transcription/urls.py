from django.urls import path
from transcription.controllers import (
    role_controller,
    user_controller,
    language_controller,
    audio_files_controller,
    transcription_controller,
    evaluation_results_controller,
    dashboard_controller,
)

urlpatterns = [
    # USER URLs
    path('users/', user_controller.getUsers),
    path('users/public/', user_controller.getUsersPublic),
    path('users/create/', user_controller.addUser),
    path('users/read/<int:pk>/', user_controller.getUser),
    path('users/update/<int:pk>/', user_controller.updateUser),
    path('users/delete/<int:pk>/', user_controller.deleteUser),
    path('users/login/', user_controller.loginUser),

    # ROLE URLs
    path('roles/', role_controller.getRoles),
    path('roles/create/', role_controller.addRole),
    path('roles/read/<int:pk>/', role_controller.getRole),
    path('roles/update/<int:pk>/', role_controller.updateRole),
    path('roles/delete/<int:pk>/', role_controller.deleteRole),

    # LANGUAGE URLs
    path('languages/', language_controller.getLanguages),
    path('languages/create/', language_controller.addLanguage),
    path('languages/read/<int:pk>/', language_controller.getLanguage),
    path('languages/update/<int:pk>/', language_controller.updateLanguage),
    path('languages/delete/<int:pk>/', language_controller.deleteLanguage),

    # AUDIO FILES URLs
    path('audio-files/', audio_files_controller.getAudioFiles),
    path('audio-files/create/', audio_files_controller.addAudioFile),
    path('audio-files/read/<int:pk>/', audio_files_controller.getAudioFile),
    path('audio-files/update/<int:pk>/', audio_files_controller.updateAudioFile),
    path('audio-files/delete/<int:pk>/', audio_files_controller.deleteAudioFile),

    # TRANSCRIPTION URLs
    path('transcriptions/', transcription_controller.getTranscriptions),
    path('transcriptions/create/', transcription_controller.addTranscription),
    path('transcriptions/read/<int:pk>/', transcription_controller.getTranscription),
    path('transcriptions/update/<int:pk>/', transcription_controller.updateTranscription),
    path('transcriptions/stats/<int:pk>/', transcription_controller.getTranscriptionStats),
    path('transcriptions/delete/<int:pk>/', transcription_controller.deleteTranscription),

    # EVALUATION RESULTS URLs
    path('evaluation-results/', evaluation_results_controller.getEvaluationResults),
    path('evaluation-results/create/', evaluation_results_controller.addEvaluationResult),
    path('evaluation-results/read/<int:pk>/', evaluation_results_controller.getEvaluationResult),
    path('evaluation-results/update/<int:pk>/', evaluation_results_controller.updateEvaluationResult),
    path('evaluation-results/delete/<int:pk>/', evaluation_results_controller.deleteEvaluationResult),

    # DASHBOARD URLs
    path('dashboard/stats/', dashboard_controller.getDashboardStats),
]
