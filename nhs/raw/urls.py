"""
URLs for the Raw data dumps.
"""
from django.conf.urls.defaults import patterns, url

from nhs.raw.views import Ratio, Drug


urlpatterns = patterns(
    '',
    url(r'/ratio/(?P<bucket1>[0-9A-Z]+)/(?P<bucket2>[0-9A-Z]+)/ratio.zip$',
        Ratio.as_view(), name='rawcompare'),

    url(r'/drug/percapitamap/ccg/(?P<bnf_code>[0-9A-Z]+)/percap.zip$',
        Drug.as_view(), name='rawdrug'),
    )
