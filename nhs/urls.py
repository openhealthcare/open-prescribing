from django.conf import settings
from django.conf.urls.defaults import patterns, url, include
from django.views.generic import TemplateView
from django.contrib.staticfiles.urls import staticfiles_urlpatterns

from nhs.views import ContactView
from nhs.subs.views import HomeView

from django.contrib import admin
#from django.contrib.gis import admin
admin.autodiscover()

urlpatterns = patterns(
    '',
    (r'^grappelli/', include('grappelli.urls')),
    (r'^admin/', include(admin.site.urls)),
    url(r'^login/$', 'django_cas.views.login', name='login'),
    url(r'^logout/$', 'django_cas.views.logout', name='logout'),
    # (r'^logout/$', 'django.contrib.auth.views.logout',
    #  {'next_page': '/'}),
    # (r'^accounts/', include('allauth.urls')),


    url('^$', TemplateView.as_view(template_name='home.html'), name='index'),
    url('^subs/', include('nhs.subs.urls')),
    url('^home$', HomeView.as_view(), name='home'),
    url(r'^about/?$', TemplateView.as_view(template_name='about.html'), name='about'),
    url(r'^contact/?$', ContactView.as_view(), name='contact'),
    url(r'^contact/ta$', TemplateView.as_view(template_name='contact_ta.html'),
        name='contact-ta'),


    url(r'^data/?$', TemplateView.as_view(template_name='data.html'), name='data'),

    url(r'^explore', include('nhs.explore.urls')),
    url(r'^raw', include('nhs.raw.urls')),

    url('^research/inhaler/?$', TemplateView.as_view(template_name='inhaler.html'), name='inhaler'),

    url(r'^api/', include('nhs.api.urls')),
    url(r'examples/hfc', 'nhs.explore.views.redirect_to_hfc', name='example-hfc'),
    url(r'examples/salbutamol', 'nhs.explore.views.redirect_to_salbutamol',
        name='example-salbutamol'),

    url(r'^blog/', include('zinnia.urls')),
    url(r'^comments/', include('django.contrib.comments.urls')),

)

urlpatterns += staticfiles_urlpatterns()

if settings.DEBUG:
    urlpatterns += patterns('',
        url(r'^media/(?P<path>.*)$', 'django.views.static.serve', {
            'document_root': settings.MEDIA_ROOT,
        }),
   )
