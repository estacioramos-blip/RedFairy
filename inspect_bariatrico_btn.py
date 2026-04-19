lp = 'C:/Users/Estacio/Desktop/redfairy/src/components/LandingPage.jsx'
with open(lp, encoding='utf-8') as f:
    txt = f.read()
idx = txt.find('BARIÁTRICO')
while idx >= 0:
    print(repr(txt[max(0,idx-50):idx+150]))
    print('---')
    idx = txt.find('BARIÁTRICO', idx+1)
