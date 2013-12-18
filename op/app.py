"""
Flask application for OP.
"""
import collections
import functools
try:
    import simplejson as json
except ImportError:
    import json
import os
import time
import urllib

import ffs
from flask import Flask, render_template, request, Response, abort, redirect

from op.db import r
from op import downloads

HERE = ffs.Path.here()
DATA = HERE / 'static/data'
AGGREGATES = DATA / 'aggregates'

def load_drugs():
    drugfile = DATA / 'drug.codes.names.csv'
    drugdict = {}
    bnfdict  = {}
    if not drugfile:
        return {}, {}

    with drugfile.csv(header=True) as csv:
        for drug in csv:
            drugdict[drug.name.upper()] = drug.bnf_code
            bnfdict[drug.bnf_code] = drug.name

    return drugdict, bnfdict

# We're just going to load all the drug names & codes into memory.
# It's < 1MB. Don't worry about it.
DRUGS, BNFS = load_drugs()
DRUG_NAMES = list(DRUGS.keys())

app = Flask(__name__)
app.config['DEBUG'] = True

"""
Helpers
"""

class Error(Exception): pass
class FileNotFoundError(Error): pass
class UnknownQueryTypeError(Error): pass

def jsonp(fn):
    @functools.wraps(fn)
    def with_callback_maybe(*args,**kwargs):
        results = json.dumps(fn(*args,**kwargs))
        if  request.args.get('callback', None):
            return '{0}({1})'.format(request.args.get('callback'), results)
        else:
            return Response(results, mimetype='application/json')
    return with_callback_maybe

def stream_file(filename):
    def stream_wrapper(fn):
        @functools.wraps(fn)
        def streamer(*args, **kwargs):
            streamable = HERE / filename
            def generate():
                for row in streamable:
                    yield row
            return Response(generate(), mimetype=streamable.mimetype)
        return streamer
    return stream_wrapper

def stream_generated_file(fname):
    """
    Given the name of a file we have just generated,
    stream it!

    Arguments:
    - `fname`: str

    Return: Response
    Exceptions: None
    """
    f = ffs.Path(fname)
    def generate():
        for row in f:
            yield row

    return Response(generate(), mimetype=f.mimetype)


def _get_aggregates(query_type, bnf_code):
    """
    Given a Query type and a bnf code, fetch the disk-stored
    aggregation for this drug at this granularity.
    """
    agg = AGGREGATES / '{0}/bnf.{1}.json'.format(query_type, bnf_code)
    aggregates = {}
    if agg:
        aggregates = agg.json_load()
    return aggregates


"""
Views
"""
@app.route("/")
def hello():
    return render_template('index.jinja2')

@app.route("/what")
def what():
    return render_template('what.jinja2')

@app.route("/why")
def why():
    return render_template('why.jinja2')

@app.route("/who")
def who():
    return render_template('who.jinja2')

@app.route("/api/doc")
def api_doc():
    return render_template('api.jinja2')

@app.route("/explore")
def explore():
    return render_template('explore.jinja2')

@app.route("/explore/drug/<bnf>")
def explore_drug(bnf):
    return render_template('explore.jinja2')


@app.route("/explore/ratio")
def explore_ratio():
    return render_template("explore_ratio.jinja2")

@app.route("/explore/ratio/<bucket1>/<bucket2>")
def explore_ratio_buckets(bucket1, bucket2):
    return render_template("explore_ratio.jinja2")

"""
Downloads
"""
@app.route("/raw/ratio/<bucket1>/<bucket2>/ratio.zip")
def download_ratio(bucket1, bucket2):
    b1, b2 = urllib.unquote(bucket1), urllib.unquote(bucket2)
    bucket = b1.split(',') + b2.split(',')
    return stream_generated_file(downloads.extract(bucket))

@app.route("/raw/drug/<bnf>/percap.zip")
def download_percapita(bnf):
    return stream_generated_file(downloads.extract([bnf]))


"""
API
"""

@app.route("/api/v2/drug/")
@jsonp
def drug_api():
    term = request.args.get('name__icontains').upper()
    limit = int(request.args.get('limit'))
    relevant_names = []
    found = 0
    for n in DRUG_NAMES:
        if found == limit:
            break
        if term in n:
            found += 1
            relevant_names.append(n)

    drugs = [dict(bnf_code=DRUGS[k], name=k) for k in relevant_names]
    return dict(objects=drugs)

@app.route("/api/v2/drug/<bnf>")
@jsonp
def drug_detail_api(bnf):
    if bnf in BNFS:
        return dict(bnf_code=bnf, name=BNFS[bnf])
    abort(404)

@app.route("/api/v2/practice/")
@stream_file("static/data/practicemetadata.json")
def practice_api(): pass

@app.route("/api/v2/ccgmetadata/")
@stream_file("static/data/ccgmetadata.json")
def ccg_api(): pass

@app.route("/api/v2/prescriptionaggregates/")
@jsonp
def prescription_aggregates_api():
    query_type = request.args.get('query_type')
    bnf_code = request.args.get('bnf_code')
    if query_type not in ['practice', 'ccg']:
        raise UnknownQueryTypeError()

    agg = AGGREGATES / '{0}/bnf.{1}.json'.format(query_type, bnf_code)
    aggregates = {}
    if agg:
        aggregates = agg.json_load()

    return dict(objects=aggregates)

@app.route("/api/v2/prescriptioncomparison/")
@jsonp
def prescription_comparison_api():
    query_type = request.args.get('query_type')
    group1 = urllib.unquote(request.args.get('group1'))
    group2 = urllib.unquote(request.args.get('group2'))

    bnfs1, bnfs2 = set(group1.split(',')), set(group2.split(','))

    aggs1 = [_get_aggregates(query_type, b) for b in bnfs1]
    aggs2 = [_get_aggregates(query_type, b) for b in bnfs2]

    def _sumit(aggregations):
        summer = collections.defaultdict(int)
        for drug in aggregations:
            for area in drug:
                summer[area] += drug[area]['count']
        return summer

    sum1 = _sumit(aggs1)
    sum2 = _sumit(aggs2)

    comparison = {}

    for area in sum1:
        total = sum1[area] + sum2[area]
        comp = dict(
            group1=dict(
                items=sum1[area],
                proportion=100 * sum1[area]/total
                ),
            group2=dict(
                items=sum2[area],
                proportion=100 * sum2[area]/total
                )
            )
        comparison[area] = comp

    return comparison

"""
Backwards compatibility
"""

INHALE_CODES = "/0301011R0AAAPAP,0301011R0BDAEAP,0301011R0BEAIAP,0301011R0BIAAAA,0301011R0BIAFAP,0301011R0BIAGBU,0301011R0BIAHAP,0301011R0BMAAAP,0301011R0BMABBU,0301011R0BYAAAP,0301011U0AAAHAH,0301011U0BBACAC,0301011U0BBAFAH,0301011U0BDAAAH,0301011U0BEAAAH,0301020I0BBAAAA,0301020I0BBADAD,0301020I0BBAGAG,0301020I0BBAJAN,0302000C0AAAAAA,0302000C0AAABAB,0302000C0AAACAC,0302000C0BBAAAC,0302000C0BCAHAB,0302000C0BCAIAA,0302000C0BCAQAR,0302000C0BEABAU,0302000C0BEACAT,0302000C0BFAAAA,0302000C0BFABAB,0302000C0BFACAC,0302000C0BFAEAT,0302000C0BFAGAR,0302000C0BGAAAA,0302000C0BJAABE,0302000C0BJABBF,0302000C0BJACBG,0302000C0BJADBH,0302000C0BJAEBG,0302000C0BJAFBH,0302000C0BPAABE,0302000C0BPABBF,0302000C0BPACBV,0302000C0BPADBW,0302000C0BQAABX,0302000K0BBADAD,0302000K0BBAEAA,0302000K0BBAMAZ,0302000K0BBANBA,0302000N0BBAXBA,0302000N0BBAYBB,0302000N0BBAZBC,0302000N0BBBBBH,0302000N0BCADBE,0302000N0BCAEBF,0302000N0BCAFBG,0302000N0BDAABJ,0302000N0BDABBK,0302000N0BDACBL,0302000U0BBAAAA,0302000U0BBABAB,0302000U0BBACAC,0303010Q0BBALAN/0301011E0BBAAAA,0301011E0BCAAAB,0301011E0BCABAC,0301011E0BDAAAD,0301011E0BEAAAE,0301011R0BEAHAQ,0301011R0BJABAF,0301011R0BPADAW,0301011R0BTAABX,0301011R0BWAABZ,0301011R0BWABCA,0301011R0BXAACB,0301011R0BXABCC,0301011U0BBAAAA,0301011U0BBABAB,0301011U0BBAEAE,0301011V0BBAMAL,0301011X0BBAAAA,0301011X0BBABAB,0301020I0BBAHAH,0301020Q0BBAAAA,0301020Q0BBABAB,0301020Q0BBACAC,0301020R0BBAAAA,0302000C0BBACAJ,0302000C0BHAAAG,0302000C0BHABAL,0302000C0BHACAH,0302000C0BHADAK,0302000C0BHAEAJ,0302000C0BHAFAQ,0302000C0BIADBI,0302000C0BIAEBJ,0302000C0BIAFBK,0302000C0BLAABM,0302000C0BLABBN,0302000C0BLACBP,0302000C0BMABAF,0302000C0BNAABU,0302000K0BBAHAG,0302000K0BBAIAH,0302000K0BBAKAK,0302000K0BCAAAH,0302000K0BDAAAL,0302000K0BDABAM,0302000K0BDACAU,0302000K0BFAAAV,0302000K0BFABAC,0302000K0BGAAAK,0302000K0BGABAX,0302000K0BGACAY,0302000N0BBACAC,0302000N0BBAFAF,0302000N0BBARAR,0302000N0BBASAS,0302000N0BBATAT,0302000N0BBAUAU,0302000N0BCAAAX,0302000N0BCABAY,0302000N0BCACAZ,0302000R0BBAAAA,0302000R0BBABAB,0302000R0BBACAC,0302000R0BBADAD,0303010Q0BBACAD"

@app.route("/example-salbutamol")
def example_salbutamol():
    return redirect("/explore/drug/0301011R0AAAPAP")

@app.route("/example-hfc")
def example_hfc():
    return redirect("/explore/ratio"+INHALE_CODES)
