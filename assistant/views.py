from django.shortcuts import render
import os
import requests
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt

def index(request):
    return render(request, 'assistant/index.html')  # This renders your main page

@csrf_exempt  # For POST requests; add CSRF in production
def check_grammar(request):
    if request.method == 'POST':
        text = request.POST.get('text', '')
        api_key = os.environ.get('API_KEY')
        if not api_key:
            return JsonResponse({'error': 'API key missing'})
        try:
            response = requests.post('https://api.example.com/grammar-check',  # Replace with real API URL
                                     headers={'Authorization': f'Bearer {api_key}'},
                                     json={'text': text})
            response.raise_for_status()
            return JsonResponse(response.json())
        except requests.RequestException as e:
            return JsonResponse({'error': f'API call failed: {str(e)}'})
    return JsonResponse({'error': 'Invalid request'})
