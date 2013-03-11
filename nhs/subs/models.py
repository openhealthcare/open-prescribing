"""
Subscription users - to be presented with custom reports etc
"""
from django.db import models
from django.contrib.auth.models import User

from nhs.practices.models import Practice
from nhs.ccgs.models import CCG

class PinnedAnalysis(models.Model):
    """
    An individual visualisation that a user might want to save
    """
    user = models.ForeignKey(User)
    name = models.CharField(max_length=200)
    frag = models.CharField(max_length=400)

class PracticeSub(models.Model):
    """
    A subscription to reports for a particular practice.
    """
    user     = models.ForeignKey(User)
    practice = models.ForeignKey(Practice)

    def __unicode__(self):
        """
        Prety prin1tin'
        """
        return '<Sub: {0} -> {1}>'.format(self.user, self.practice)


class CCGSub(models.Model):
    """
    A subscription to reports for a particular ccg.
    """
    user     = models.ForeignKey(User)
    ccg = models.ForeignKey(CCG)

    def __unicode__(self):
        """
        Prety printin'
        """
        return '<Sub: {0} -> {1}>'.format(self.user, self.ccg)
