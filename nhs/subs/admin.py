from django.contrib import admin

from nhs.subs.models import PracticeSub, CCGSub

class PracticeSubAdmin(admin.ModelAdmin):
    """
    Admin creation of practice subscriptions
    """

class CcgSubAdmin(admin.ModelAdmin):
    """
    Admin creation of ccg subscriptions
    """

admin.site.register(PracticeSub, PracticeSubAdmin)

admin.site.register(CCGSub, CcgSubAdmin)
