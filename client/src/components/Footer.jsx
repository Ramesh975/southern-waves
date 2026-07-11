import { Link } from 'react-router-dom';

const Footer = () => {
  const categories = ['News', 'Editorial', 'Features', 'Tea Shop', "Picture's Speak", 'Know Our Past'];
  const quick = ['About Us', "FAQ's", 'Write For Us', 'Contact'];

  return (
    <footer className="footer" role="contentinfo">
      <div className="container">
        <div className="footer-grid">
          <div className="footer-brand">
            <div className="footer-logo">Southern Waves</div>
            <p className="footer-desc">
              A student medium to share information and enlighten young minds across different walks of life
              towards a common path. Empowering student voices across Tamil Nadu.
            </p>
          </div>
          <div>
            <p className="footer-heading">Categories</p>
            <div className="footer-links">
              {categories.map((c) => (
                <Link
                  key={c}
                  to={`/${c.toLowerCase().replace(/ /g, '-').replace(/'/g, '')}`}
                  className="footer-link"
                >
                  {c}
                </Link>
              ))}
            </div>
          </div>
          <div>
            <p className="footer-heading">Navigate</p>
            <div className="footer-links">
              {quick.map((q) => (
                <Link key={q} to={`/${q.toLowerCase().replace(/ /g, '-').replace(/'/g, '')}`} className="footer-link">
                  {q}
                </Link>
              ))}
            </div>
          </div>
          <div>
            <p className="footer-heading">Connect</p>
            <div className="footer-links">
              <a href="#" className="footer-link">📸 Instagram</a>
              <a href="#" className="footer-link">🐦 Twitter / X</a>
              <a href="#" className="footer-link">📘 Facebook</a>
              <a href="#" className="footer-link">✉️ Newsletter</a>
            </div>
          </div>
        </div>
        <div className="footer-bottom">
          <span>© {new Date().getFullYear()} Southern Waves. All rights reserved.</span>
          <span>Made with passion by student journalists.</span>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
