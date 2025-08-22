import os
import requests  # If making API calls
from django.shortcuts import render

def index(request):
    api_key = os.environ.get('API_KEY')
    # Example: Use key for a server-side API call
    # response = requests.post('https://api.example.com/grammar-check', headers={'Authorization': f'Bearer {api_key}'}, data={'text': 'some text'})
    # result = response.json()
    return render(request, 'assistant/index.html', {'api_key': api_key})  # Only if needed client-side; avoid if possible
