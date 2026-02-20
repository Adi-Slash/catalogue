import { useEffect, useRef } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import './HelpAbout.css';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export default function HelpAbout({ isOpen, onClose }: Props) {
  const { t } = useLanguage();
  const modalRef = useRef<HTMLDivElement>(null);

  // Close on Escape key
  useEffect(() => {
    function handleEscape(e: KeyboardEvent) {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    }

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      // Prevent body scroll when modal is open
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);

  // Focus trap
  useEffect(() => {
    if (isOpen && modalRef.current) {
      const focusableElements = modalRef.current.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      const firstElement = focusableElements[0] as HTMLElement;
      const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;

      function handleTab(e: KeyboardEvent) {
        if (e.key !== 'Tab') return;

        if (e.shiftKey) {
          if (document.activeElement === firstElement) {
            e.preventDefault();
            lastElement?.focus();
          }
        } else {
          if (document.activeElement === lastElement) {
            e.preventDefault();
            firstElement?.focus();
          }
        }
      }

      firstElement?.focus();
      document.addEventListener('keydown', handleTab);

      return () => {
        document.removeEventListener('keydown', handleTab);
      };
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="help-about-overlay" onClick={onClose}>
      <div
        className="help-about-modal"
        ref={modalRef}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="help-about-title"
      >
        <div className="help-about-header">
          <h2 id="help-about-title">{t('helpAbout.title')}</h2>
          <button
            className="help-about-close"
            onClick={onClose}
            aria-label={t('common.close')}
          >
            ×
          </button>
        </div>

        <div className="help-about-content">
          <section className="help-about-section">
            <h3>{t('helpAbout.whatIsIt')}</h3>
            <p>{t('helpAbout.whatIsItDescription')}</p>
          </section>

          <section className="help-about-section">
            <h3>{t('helpAbout.howToUse')}</h3>
            <div className="help-about-steps">
              <div className="help-about-step">
                <div className="step-number">1</div>
                <div className="step-content">
                  <h4>{t('helpAbout.step1Title')}</h4>
                  <p>{t('helpAbout.step1Description')}</p>
                </div>
              </div>

              <div className="help-about-step">
                <div className="step-number">2</div>
                <div className="step-content">
                  <h4>{t('helpAbout.step2Title')}</h4>
                  <p>{t('helpAbout.step2Description')}</p>
                </div>
              </div>

              <div className="help-about-step">
                <div className="step-number">3</div>
                <div className="step-content">
                  <h4>{t('helpAbout.step3Title')}</h4>
                  <p>{t('helpAbout.step3Description')}</p>
                </div>
              </div>

              <div className="help-about-step">
                <div className="step-number">4</div>
                <div className="step-content">
                  <h4>{t('helpAbout.step4Title')}</h4>
                  <p>{t('helpAbout.step4Description')}</p>
                </div>
              </div>

              <div className="help-about-step">
                <div className="step-number">5</div>
                <div className="step-content">
                  <h4>{t('helpAbout.step5Title')}</h4>
                  <p>{t('helpAbout.step5Description')}</p>
                </div>
              </div>
            </div>
          </section>

          <section className="help-about-section">
            <h3>{t('helpAbout.features')}</h3>
            <ul className="help-about-features">
              <li>{t('helpAbout.feature1')}</li>
              <li>{t('helpAbout.feature2')}</li>
              <li>{t('helpAbout.feature3')}</li>
              <li>{t('helpAbout.feature4')}</li>
              <li>{t('helpAbout.feature5')}</li>
              <li>{t('helpAbout.feature6')}</li>
            </ul>
          </section>

          <section className="help-about-section">
            <h3>{t('helpAbout.tips')}</h3>
            <ul className="help-about-tips">
              <li>{t('helpAbout.tip1')}</li>
              <li>{t('helpAbout.tip2')}</li>
              <li>{t('helpAbout.tip3')}</li>
              <li>{t('helpAbout.tip4')}</li>
            </ul>
          </section>
        </div>

        <div className="help-about-footer">
          <button className="help-about-close-btn" onClick={onClose}>
            {t('common.close')}
          </button>
        </div>
      </div>
    </div>
  );
}
