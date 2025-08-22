@csrf_exempt
def check_grammar(request):
    if request.method == 'POST':
        text = request.POST.get('text', '')
        language = request.POST.get('language', 'en')  # Get language from JS
        api_key = os.environ.get('API_KEY')

        if not api_key:
            logger.error("API_KEY missing")
            return JsonResponse({'error': 'API key not configured'}, status=500)

        api_url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key={api_key}"

        # Your prompt (keep as is)
        language_map = {'en': 'English', 'es': 'Spanish', 'fr': 'French', 'de': 'German', 'bn': 'Bengali'}
        target_lang = language_map.get(language, 'English')
        prompt = f"""
        Analyze the user's text: "{text}".
        Provide a response as a single, valid JSON object. All explanations MUST be in {target_lang}.
        The JSON must have this exact structure:
        {{
            "original": "The original text.",
            "corrected": "The corrected text.",
            "translation": "The full meaning in {target_lang}",
            "errors": [
                {{
                    "wrong": "incorrect phrase",
                    "correct": "correction",
                    "explanation": "Detailed explanation including verb tense rules if applicable.",
                    "tenseExplanation": "Explanation of why the tense is incorrect and how to use it correctly"
                }}
            ],
            "rewrites": {{
                "formal": "Formal rewrite.",
                "informal": "Informal rewrite.",
                "polite": "Polite rewrite."
            }},
            "prediction": "A likely next sentence."
        }}
        If no errors, "errors" must be an empty array. Do not include any text or markdown outside of the JSON object.
        For verb tense errors, provide detailed explanations about why the tense is incorrect and how to use the correct tense.
        """

        payload = {
            "contents": [{"parts": [{"text": prompt}]}],
            "generationConfig": {"responseMimeType": "application/json"}
        }

        try:
            response = requests.post(api_url, json=payload, timeout=10)
            response.raise_for_status()
            result = response.json()
            # Fixed line: Add [0] after get('parts', [{}]) since 'parts' is a list
            json_text = result.get('candidates', [{}]).get('content', {}).get('parts', [{}]).get('text', '{}')
            parsed_response = json.loads(json_text)
            logger.info("API call successful")
            return JsonResponse(parsed_response)
        except (requests.RequestException, json.JSONDecodeError) as e:
            logger.error(f"API call failed: {str(e)}")
            return JsonResponse({'error': f'API error: {str(e)}'}, status=500)

    return JsonResponse({'error': 'Invalid request'}, status=400)
