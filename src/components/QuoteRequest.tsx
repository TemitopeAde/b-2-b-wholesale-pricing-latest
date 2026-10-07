import React, { type FC } from 'react';
import styles from '../dashboard/pages/element.module.css';


export const QuoteRequestsView: FC = () => {
    const mockQuotes = [
        {
            id: 'Q001',
            customer: 'Metro Supply Co.',
            items: 12,
            total: '$4,250',
            status: 'Pending',
            submitted: '2 hours ago',
        },
        {
            id: 'Q002',
            customer: "John's Hardware Store",
            items: 8,
            total: '$1,890',
            status: 'Approved',
            submitted: '1 day ago',
        },
        {
            id: 'Q003',
            customer: 'City Building Materials',
            items: 15,
            total: '$6,720',
            status: 'In Review',
            submitted: '3 days ago',
        },
    ];

    return (
        <div className={styles.content}>
            <div className={styles.pageHeaderWithAction}>
                <div>
                    <h1 className={styles.pageTitle}>Quote Requests</h1>
                    <p className={styles.pageSubtitle}>Review and respond to wholesale quote requests</p>
                </div>
                <span className={styles.badgeUrgent}>23 Pending</span>
            </div>

            <div className={styles.card}>
                <div className={styles.tableWrapper}>
                    <table className={styles.table}>
                        <thead>
                            <tr>
                                <th>Quote ID</th>
                                <th>Customer</th>
                                <th>Items</th>
                                <th>Total</th>
                                <th>Status</th>
                                <th>Submitted</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {mockQuotes.map((quote) => (
                                <tr key={quote.id}>
                                    <td className={styles.quoteId}>{quote.id}</td>
                                    <td>{quote.customer}</td>
                                    <td>{quote.items}</td>
                                    <td className={styles.totalAmount}>{quote.total}</td>
                                    <td>
                                        <span className={`${styles.statusBadge} ${styles[`status${quote.status.replace(' ', '')}`]}`}>
                                            {quote.status}
                                        </span>
                                    </td>
                                    <td className={styles.submittedTime}>{quote.submitted}</td>
                                    <td>
                                        <div className={styles.actionButtons}>
                                            <button className={styles.secondaryButtonSmall}>Review</button>
                                            <button className={styles.primaryButtonSmall}>Approve</button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};