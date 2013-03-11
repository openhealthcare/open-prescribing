"""
Urls for subscription functionality
"""
from django.conf.urls.defaults import patterns, url, include

from nhs.subs.views import PinSave, PracticeReport

urlpatterns = patterns(
    '',
    url(r'pin/save', PinSave.as_view()),
    url('practice/(?P<pk>\d+)/?$', PracticeReport.as_view(), name='practice-sub')
    )
