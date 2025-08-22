from django.db import models

# You can add models here if you want to store history in the database instead of local storage
# For now, we're using the frontend local storage as in your original implementation

class SearchHistory(models.Model):
    query = models.TextField()
    timestamp = models.DateTimeField(auto_now_add=True)
    
    def __str__(self):
        return self.query