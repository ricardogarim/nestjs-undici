# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 1.x.x   | :white_check_mark: |
| < 1.0   | :x:                |

## Reporting a Vulnerability

If you discover a security vulnerability in nestjs-undici, please report it by:

1. **DO NOT** open a public issue
2. Email security concerns to: ricardo@garim.com.br
3. Include:
   - Description of the vulnerability
   - Steps to reproduce
   - Potential impact
   - Suggested fix (if any)

### Response Timeline

- **Initial Response**: Within 48 hours
- **Status Update**: Within 5 business days
- **Resolution Target**: Within 30 days for critical issues

## Security Best Practices

When using nestjs-undici:

1. **Keep Dependencies Updated**: Regularly update to the latest version
2. **Use HTTPS**: Always use HTTPS for production APIs
3. **Validate Input**: Sanitize and validate all user inputs
4. **Handle Errors**: Properly handle and log errors without exposing sensitive data
5. **Secure Headers**: Use appropriate security headers in your requests
6. **Timeout Configuration**: Set appropriate timeouts to prevent DoS

## Automated Security

This project uses:
- Dependabot for dependency updates
- GitHub Security Advisories
- npm audit in CI pipeline
- CodeQL analysis (if enabled)