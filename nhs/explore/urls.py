"""
Urls for the interactive exploration pages
"""
from django.conf.urls.defaults import patterns, url
from django.views.generic import TemplateView

from nhs.explore.views import Explore, Ratio, ExploreDrug, ExploreRatio

urlpatterns = patterns(
    '',
    url(r'/ratio/?$', ExploreRatio.as_view(), name='explorecompare'),

    url(r'/ratio/(?P<bucket1>[0-9A-Z,]+)/(?P<bucket2>[0-9A-Z,]+)',
        Ratio.as_view(), name='ratio'),

    url(r'/drug/?', ExploreDrug.as_view(template_name='explore_drug.html'),
        name='exploredrug'),
    url(r'/?$', Explore.as_view(), name='explore'),
    )
