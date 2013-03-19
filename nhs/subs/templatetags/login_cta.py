"""
Render a login / signup form as a CTA
"""
from django import template

register = template.Library()

@register.inclusion_tag('subs/explore_cta.html', takes_context=True)
def login_cta(context):
    """
    check if we need to authenticate and do so if required
    """
    return context
