"""
Views related to subscription options
"""
from django.http import HttpResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.generic import TemplateView, View

from nhs.subs.models import PinnedAnalysis

class HomeView(TemplateView):
    """
    A user's home page
    """
    template_name = 'subs/home.html'


class PinSave(View):
    """
    Allow the saving of a pinned analysis
    """

    @csrf_exempt
    def dispatch(self, *args, **kw):
        return super(PinSave, self).dispatch(*args, **kw)

    def post(self, *args, **kw):
        """
        Get or create or raise
        """
        pin = PinnedAnalysis.objects.get_or_create(
            user=self.request.user,
            frag=self.request.POST['frag'],
            )[0]
        pin.name = self.request.POST['name']
        pin.save()

        return HttpResponse('kk')
