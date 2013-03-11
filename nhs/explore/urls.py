"""
Urls for the interactive exploration pages
"""
from django.conf.urls.defaults import patterns, url
from django.views.generic import TemplateView

from nhs.explore.views import Explore, Ratio, ExploreDrug

urlpatterns = patterns(
    '',
    url(r'/ratio/?', Ratio.as_view(template_name='explore_compare.html'),
        name='explorecompare'),
    url(r'/drug/?', ExploreDrug.as_view(template_name='explore_drug.html'),
        name='exploredrug'),
    url(r'/?$', Explore.as_view(), name='explore'),
    )
