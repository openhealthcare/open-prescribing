"""
Urls for subscription functionality
"""
from django.conf.urls.defaults import patterns, url, include

from nhs.subs.views import PinSave

urlpatterns = patterns(
    '',
    url(r'pin/save', PinSave.as_view()),
    )
