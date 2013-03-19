"""
Render tracking code
"""
from django import template
from django.conf import settings

register = template.Library()

@register.inclusion_tag('subs/tracking.html')
def tracking():
    """
    Render tracking code.
    Or don't.
    """
    return dict(track=settings.TRACK_USERS)
