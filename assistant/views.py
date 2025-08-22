from django.shortcuts import render
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
import os
import requests
import logging

logger = logging.getLogger(__name__)

def index(request):
    # This renders your main page (index.html)
    return render(request, 'assistant/index.html')

@csrf_exempt  # Use for testing; add CSRF protection in production
def check_grammar(request):
    if request.method == 'POST':
        text = request.POST.get('text', '')
        api_key = os.environ.get('API_KEY')
        logger.info(f"API_KEY fetched: {api_key}")  # Log to verify

        if not api_key:
            logger.error("API_KEY is missing")
            return JsonResponse({'error': 'API key not configured'})

        try:
            # Replace with your actual API URL (e.g., OpenAI endpoint)
            response = requests.post('https://api.openai.com/v1/completions',  # Example for OpenAI
                                     headers={'Authorization': f'Bearer {api_key}'},
                                     json={'model': 'text-davinci-003', 'prompt': f'Correct grammar: {text}', 'max_tokens': 100})
            response.raise_for_status()
            result = response.json()
            logger.info("API call successful")
            return JsonResponse({'corrected_text': result['choices'][0]['text'].strip()})
        except requests.RequestException as e:
            logger.error(f"API call failed: {str(e)}")
            return JsonResponse({'error': f'API error: {str(e)}'})
    return JsonResponse({'error': 'Invalid request'})
