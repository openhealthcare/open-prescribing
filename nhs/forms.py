"""
Top level site forms unrelated to apps
"""
from django import forms
from django.conf import settings
from django.core.mail import send_mail

class ContactForm(forms.Form):
    """"
    Mailto links are awzm.
    """
    name    = forms.CharField()
    email   = forms.EmailField()
    message = forms.CharField(widget=forms.Textarea)

    def send_email(self):
        """
        Do work.
        """
        subject = 'Open Prescribing - Contact Form'
        message = "Contact-form from: {0}\n\n{1}".format(
            '{0} <{1}>'.format(
            self.cleaned_data['name'],
            self.cleaned_data['email']),

            self.cleaned_data['message'])


        recipient_list = [settings.CONTACT_EMAIL]
        send_mail(subject, message, settings.DEFAULT_FROM_EMAIL, recipient_list)
        return
