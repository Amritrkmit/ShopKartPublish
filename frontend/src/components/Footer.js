import React from 'react';
import './Footer.css';
import { Link } from 'react-router-dom';
import { Facebook, Twitter, Youtube, Instagram, Briefcase, Star, Gift, HelpCircle } from 'lucide-react';

const Footer = () => {
  return (
    <footer className="footer">
      <div className="footer-container max-w-[1248px] px-3">

        <div className="footer-top">
          {/* Left Section: Links */}
          <div className="footer-links">
            <div className="footer-col">
              <h4>ABOUT</h4>
              <Link to="/contact-us/">Contact Us</Link>
              <Link to="/about-us/">About Us</Link>
              <Link to="/careers/">Careers</Link>
              <Link to="/stories/">Shopkart Stories</Link>
              <Link to="/press/">Press</Link>
              <Link to="/corporate/">Corporate Information</Link>
            </div>

            <div className="footer-col">
              <h4>GROUP COMPANIES</h4>
              <Link to="/myntra/">Myntra</Link>
              <Link to="/cleartrip/">Cleartrip</Link>
              <Link to="/shopsy/">Shopsy</Link>
            </div>

            <div className="footer-col">
              <h4>HELP</h4>
              <Link to="/payments/">Payments</Link>
              <Link to="/shipping/">Shipping</Link>
              <Link to="/cancellation-returns/">Cancellation & Returns</Link>
              <Link to="/faq/">FAQ</Link>
              <Link to="/report-infringement/">Report Infringement</Link>
            </div>

            <div className="footer-col">
              <h4>CONSUMER POLICY</h4>
              <Link to="/cancellation-returns/">Cancellation & Returns</Link>
              <Link to="/terms/">Terms Of Use</Link>
              <Link to="/security/">Security</Link>
              <Link to="/privacy/">Privacy</Link>
              <Link to="/sitemap/">Sitemap</Link>
              <Link to="/grievance/">Grievance Redressal</Link>
              <Link to="/epr/">EPR Compliance</Link>
            </div>
          </div>

          {/* Vertical Divider for large screens */}
          <div className="footer-divider-vertical"></div>

          {/* Right Section: Address & Social */}
          <div className="footer-address-section">
            <div className="footer-col address-col">
              <h4>Mail Us:</h4>
              <p>
                Flipkart Internet Private Limited,<br />
                Buildings Alyssa, Begonia &<br />
                Clove Embassy Tech Village,<br />
                Outer Ring Road, Devarabeesanahalli Village,<br />
                Bengaluru, 560103,<br />
                Karnataka, India
              </p>

              <div className="social-links-container">
                <h4>Social:</h4>
                <div className="social-icons">
                  <a href="https://facebook.com" target="_blank" rel="noopener noreferrer" aria-label="Facebook"><Facebook size={18} /></a>
                  <a href="https://twitter.com" target="_blank" rel="noopener noreferrer" aria-label="Twitter"><Twitter size={18} /></a>
                  <a href="https://youtube.com" target="_blank" rel="noopener noreferrer" aria-label="YouTube"><Youtube size={18} /></a>
                  <a href="https://instagram.com" target="_blank" rel="noopener noreferrer" aria-label="Instagram"><Instagram size={18} /></a>
                </div>
              </div>
            </div>

            <div className="footer-col address-col">
              <h4>Registered Office Address:</h4>
              <p>
                Flipkart Internet Private Limited,<br />
                Buildings Alyssa, Begonia &<br />
                Clove Embassy Tech Village,<br />
                Outer Ring Road, Devarabeesanahalli Village,<br />
                Bengaluru, 560103,<br />
                Karnataka, India<br />
                CIN : U51109KA2012PTC066107<br />
                Telephone: <a href="tel:04445614700" className="text-blue-500">044-45614700</a>
              </p>
            </div>
          </div>
        </div>

        {/* Footer Bottom Bar */}
        <div className="footer-bottom">
          <div className="footer-bottom-links">
            <Link to="/seller/" className="bottom-link">
              <Briefcase size={14} color="#f5c225" />
              <span>Become a Seller</span>
            </Link>
            <Link to="/advertise/" className="bottom-link">
              <Star size={14} color="#f5c225" />
              <span>Advertise</span>
            </Link>
            <Link to="/gift-cards/" className="bottom-link">
              <Gift size={14} color="#f5c225" />
              <span>Gift Cards</span>
            </Link>
            <Link to="/help/" className="bottom-link">
              <HelpCircle size={14} color="#f5c225" />
              <span>Help Center</span>
            </Link>

            <span className="copyright-text">&copy; 2007-{new Date().getFullYear()} Flipkart.com</span>
          </div>

          <div className="payment-methods">
            <img src="https://static-assets-web.flixcart.com/fk-p-linchpin-web/fk-cp-zion/img/payment-method_69e7ec.svg" alt="Payment Methods" />
          </div>
        </div>

      </div>
    </footer>
  );
};

export default Footer;
