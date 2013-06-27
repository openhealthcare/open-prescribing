from django import template

register = template.Library()

@register.simple_tag
def active(request, pattern):
    import re
    if not hasattr(request, 'path'):
        return ''
    if pattern == "":
        return "active" if request.path == "/" else ""
    return 'active' if re.match(pattern, request.path) else ''