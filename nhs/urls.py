from django.conf import settings
from django.conf.urls.defaults import patterns, url, include
from django.views.generic import TemplateView
from django.contrib.staticfiles.urls import staticfiles_urlpatterns

from django.contrib import admin
#from django.contrib.gis import admin
admin.autodiscover()

urlpatterns = patterns(
    '',
    url('^$', TemplateView.as_view(template_name='home.html'), name='home'),
    url(r'^about/?$', TemplateView.as_view(template_name='about.html'), name='about'),
    url(r'^data/?$', TemplateView.as_view(template_name='data.html'), name='data'),
    url(r'^explore', include('nhs.explore.urls')),
    url(r'^raw', include('nhs.raw.urls')),

    url('^research/inhaler/?$', TemplateView.as_view(template_name='inhaler.html'), name='inhaler'),

    url(r'^api/', include('nhs.api.urls')),
    url(r'examples/hfc', 'nhs.explore.views.redirect_to_hfc'),
    url(r'examples/salbutamol', 'nhs.explore.views.redirect_to_salbutamol'),

    (r'^admin/', include(admin.site.urls)),
)

urlpatterns += staticfiles_urlpatterns()
