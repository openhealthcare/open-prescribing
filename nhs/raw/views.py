"""
Views to create Zipfiles of data for download
"""
from django.conf import settings
from django.http import HttpResponse
from django.views.generic import View

from nhs.raw import zippy

class Ratio(View):
    """
    Build a file to contain the ratio of two buckets.
    """
    def get(self, request, bucket1, bucket2):
        return HttpResponse(' '.join(['got', bucket1, bucket2]))

class Drug(View):
    """
    Build a file to contain the prescribing of a particular drug
    """
    def get(self, request, bnf_code):
        """
        Django boilerplate for serving a Zipfile that we're creating on
        the fly.

        Let the zippy module do the file creation, then figure out
        whether we serve through Django or jus let Nginx know where
        we've put the file.
        """
        filename = zippy.drug(bnf_code)

        # When we're running locally, just take the hit, otherwise
        # offload the serving of the datafile to Nginx
        if settings.DEBUG:
            resp = HttpResponse(
                open(filename, 'rb').read(),
                mimetype='application/force-download'
                )
            return resp

        resp = HttpResponse()
        url = '/protected/{0}'.format(filename)
        # let nginx determine the correct content type
        resp['Content-Type']=""
        resp['X-Accel-Redirect'] = url
        return resp
