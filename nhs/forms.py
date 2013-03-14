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
        message = self.cleaned_data['message']
        from_email = '{0} <{1}>'.format(
            self.cleaned_data['name'],
            self.cleaned_data['email'])
        recipient_list = [settings.CONTACT_EMAIL]
        send_mail(subject, message, from_email, recipient_list)
        return
