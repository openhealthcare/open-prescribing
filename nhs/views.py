"""
Top level Open Prescribing views
"""
from django.core.urlresolvers import reverse_lazy
from django.views.generic.edit import FormView

from nhs.forms import ContactForm

class ContactView(FormView):
    """
    Pointless form for people who don't like their email clients
    """
    template_name = 'contact.html'
    form_class    = ContactForm
    success_url   = reverse_lazy('contact-ta')

    def form_valid(self, form):
        """
        Praise be, someone has spammed us.
        """
        form.send_email()
        return super(ContactView, self).form_valid(form)
