from django.urls import path
from . import views

urlpatterns = [
    path('', views.index, name='index'),  # Main page
    path('check-grammar/', views.check_grammar, name='check_grammar'),  # API endpoint
]
