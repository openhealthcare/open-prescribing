"""
Views for exploring the dataset dynamically

"""
from allauth.account.forms import LoginForm
from django.contrib.auth.decorators import login_required
from django.core.urlresolvers import reverse
from django.http import HttpResponseRedirect
from django.utils.decorators import method_decorator
from django.views.generic import TemplateView

from nhs.prescriptions.models import Product
from nhs.subs.models import PinnedAnalysis

INHALE_CODES = "/0301011R0AAAPAP,0301011R0BDAEAP,0301011R0BEAIAP,0301011R0BIAAAA,0301011R0BIAFAP,0301011R0BIAGBU,0301011R0BIAHAP,0301011R0BMAAAP,0301011R0BMABBU,0301011R0BYAAAP,0301011U0AAAHAH,0301011U0BBACAC,0301011U0BBAFAH,0301011U0BDAAAH,0301011U0BEAAAH,0301020I0BBAAAA,0301020I0BBADAD,0301020I0BBAGAG,0301020I0BBAJAN,0302000C0AAAAAA,0302000C0AAABAB,0302000C0AAACAC,0302000C0BBAAAC,0302000C0BCAHAB,0302000C0BCAIAA,0302000C0BCAQAR,0302000C0BEABAU,0302000C0BEACAT,0302000C0BFAAAA,0302000C0BFABAB,0302000C0BFACAC,0302000C0BFAEAT,0302000C0BFAGAR,0302000C0BGAAAA,0302000C0BJAABE,0302000C0BJABBF,0302000C0BJACBG,0302000C0BJADBH,0302000C0BJAEBG,0302000C0BJAFBH,0302000C0BPAABE,0302000C0BPABBF,0302000C0BPACBV,0302000C0BPADBW,0302000C0BQAABX,0302000K0BBADAD,0302000K0BBAEAA,0302000K0BBAMAZ,0302000K0BBANBA,0302000N0BBAXBA,0302000N0BBAYBB,0302000N0BBAZBC,0302000N0BBBBBH,0302000N0BCADBE,0302000N0BCAEBF,0302000N0BCAFBG,0302000N0BDAABJ,0302000N0BDABBK,0302000N0BDACBL,0302000U0BBAAAA,0302000U0BBABAB,0302000U0BBACAC,0303010Q0BBALAN/0301011E0BBAAAA,0301011E0BCAAAB,0301011E0BCABAC,0301011E0BDAAAD,0301011E0BEAAAE,0301011R0BEAHAQ,0301011R0BJABAF,0301011R0BPADAW,0301011R0BTAABX,0301011R0BWAABZ,0301011R0BWABCA,0301011R0BXAACB,0301011R0BXABCC,0301011U0BBAAAA,0301011U0BBABAB,0301011U0BBAEAE,0301011V0BBAMAL,0301011X0BBAAAA,0301011X0BBABAB,0301020I0BBAHAH,0301020Q0BBAAAA,0301020Q0BBABAB,0301020Q0BBACAC,0301020R0BBAAAA,0302000C0BBACAJ,0302000C0BHAAAG,0302000C0BHABAL,0302000C0BHACAH,0302000C0BHADAK,0302000C0BHAEAJ,0302000C0BHAFAQ,0302000C0BIADBI,0302000C0BIAEBJ,0302000C0BIAFBK,0302000C0BLAABM,0302000C0BLABBN,0302000C0BLACBP,0302000C0BMABAF,0302000C0BNAABU,0302000K0BBAHAG,0302000K0BBAIAH,0302000K0BBAKAK,0302000K0BCAAAH,0302000K0BDAAAL,0302000K0BDABAM,0302000K0BDACAU,0302000K0BFAAAV,0302000K0BFABAC,0302000K0BGAAAK,0302000K0BGABAX,0302000K0BGACAY,0302000N0BBACAC,0302000N0BBAFAF,0302000N0BBARAR,0302000N0BBASAS,0302000N0BBATAT,0302000N0BBAUAU,0302000N0BCAAAX,0302000N0BCABAY,0302000N0BCACAZ,0302000R0BBAAAA,0302000R0BBABAB,0302000R0BBACAC,0302000R0BBADAD,0303010Q0BBACAD"

class PinnedView(TemplateView):
    """
    Check to see if this view has been pinned
    """
    def get_context_data(self, **kw):
        context = super(PinnedView, self).get_context_data(**kw)
        if not self.request.user.is_authenticated():
            return context

        pinned = PinnedAnalysis.objects.filter(user=self.request.user,
                                               frag=self.request.path)
        if pinned.count() > 0:
            context['html_classes'] = ['pinned']
        return context


class Explore(TemplateView):
    """
    Initial home page for explorations.
    Deal with non-logged in users.
    """
    template_name='explore.html'


class ExploreRatio(TemplateView):
    """
    Pick two drugs and get a ratio heatmap
    """
    template_name = 'vis/explore_ratio.html'

    def get_context_data(self, **kw):
        context = super(ExploreRatio, self).get_context_data(**kw)
        context['products'] = Product.objects.all()
        return context


class ExploreDrug(PinnedView):
    """
    Explore drugs
    """
    template_name = 'vis/explore_drug.html'

    def get_context_data(self, **kw):
        context = super(ExploreDrug, self).get_context_data(**kw)
        context['products'] = Product.objects.all()
        return context


class Ratio(PinnedView):
    """
    A specific ratio of drugs we want to render.
    Could well be a shared link.
    """
    template_name = 'vis/ratio.html'

    def get_context_data(self, bucket1=[], bucket2=[]):
        """
        Pre-populate the buckets please...
        """
        context = super(Ratio, self).get_context_data(bucket1=bucket1, bucket2=bucket2)
        context['bucket1'] = Product.objects.filter(bnf_code__in=bucket1.split(','))
        context['bucket2'] = Product.objects.filter(bnf_code__in=bucket2.split(','))
        return context


class Drug(PinnedView):
    """
    Show prescriptions per-capita for a particular drug
    """
    template_name = 'vis/drug.html'


def redirect_to_hfc(request):
    """
    Trivial redirect that provides a nice URL to link to
    externally
    """
    base = reverse('explorecompare')
    return HttpResponseRedirect(base+INHALE_CODES)

def redirect_to_salbutamol(request):
    """
    Trivial redirect that provides a nice URL to link to
    externally
    """
    return HttpResponseRedirect(reverse('drug', kwargs=dict(bucket='0301011R0AAAPAP')))
