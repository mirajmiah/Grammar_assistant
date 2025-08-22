import os
import requests
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
import logging

logger = logging.getLogger(__name__)  # For logging errors

@csrf_exempt
def check_grammar(request):  # Your API view
    if request.method == 'POST':
        text = request.POST.get('text', '')
        api_key = os.environ.get('API_KEY')  # Fetch from env
        logger.info(f"API_KEY fetched: {api_key}")  # Log to check if it's loaded

        if not api_key:
            logger.error("API_KEY is missing or empty")
            return JsonResponse({'error': 'API key not configured'})

        try:
            response = requests.post('https://api.example.com/grammar-check',  # Replace with your real API URL
                                     headers={'Authorization': f'Bearer {api_key}'},
                                     json={'text': text},
                                     timeout=10)  # Add timeout to prevent hangs
            response.raise_for_status()
            logger.info("API call successful")
            return JsonResponse(response.json())
        except requests.RequestException as e:
            logger.error(f"API call failed: {str(e)}")
            return JsonResponse({'error': f'API error: {str(e)}'})
    return JsonResponse({'error': 'Invalid request method'})
