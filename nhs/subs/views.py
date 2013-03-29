"""
Views related to subscription options
"""
from django.db.models import Sum
from django.http import HttpResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.generic import TemplateView, View

from nhs.subs.models import PinnedAnalysis, PracticeSub

class HomeView(TemplateView):
    """
    A user's home page
    """
    template_name = 'subs/home.html'

    def get_context_data(self, **kw):
        context = super(HomeView, self).get_context_data(**kw)
        context['title'] = 'Your Account'
        return context

class PracticeReport(TemplateView):
    """
    Details of a user's subscription to practices
    """
    template_name = 'subs/practicesub_detail.html'

    def get_context_data(self, **kw):
        """
        Add the reporting data!
        """
        context = super(PracticeReport, self).get_context_data(**kw)
        sub = PracticeSub.objects.get(**kw)
        prac = sub.practice
        context['practice'] = prac
        context['total_scrips'] = prac.prescription_set.count()
        context['total_cost'] = prac.prescription_set.all().aggregate(
            Sum('actual_cost'))['actual_cost__sum']
        context['top_5'] = prac.prescription_set.order_by('-quantity')[:5]
        return context


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
