import os
import sys
sys.path.append('.')

from op import app

if __name__ == "__main__":
    port = int(os.environ.get('PORT', 5000))
    print "Starting on 0.0.0.0", port
    app.app.run(host='0.0.0.0', port=port)
