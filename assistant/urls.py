from django.urls import path
from . import views

urlpatterns = [
    path('', views.index, name='index'),  # Matches your original
    path('check-grammar/', views.check_grammar, name='check_grammar'),  # For API
]
