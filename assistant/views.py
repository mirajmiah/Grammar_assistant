import logging
import requests
from django.http import JsonResponse

logger = logging.getLogger(__name__)

def check_grammar(request):  # Or your API view
    logger.info("API call started")
    try:
        text = request.POST.get('text', '')
        api_key = os.environ.get('API_KEY')
        if not api_key:
            logger.error("API_KEY not set")
            return JsonResponse({'error': 'API key missing'})
        response = requests.post('https://api.example.com/grammar-check',  # Replace with real URL
                                 headers={'Authorization': f'Bearer {api_key}'},
                                 json={'text': text})
        response.raise_for_status()  # Raise error on bad status
        logger.info("API success")
        return JsonResponse(response.json())
    except requests.RequestException as e:
        logger.error(f"API error: {str(e)}")
        return JsonResponse({'error': 'API call failed'})
